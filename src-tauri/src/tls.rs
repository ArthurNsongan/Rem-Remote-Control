//! Certificat TLS auto-signé du serveur LAN.
//!
//! Le client est un navigateur de téléphone : impossible de lui faire
//! installer une autorité de certification, et aucune AC publique ne signe un
//! certificat pour une IP privée. On génère donc le nôtre.
//!
//! Le certificat est **conservé sur disque** : c'est ce qui fait que
//! l'avertissement du navigateur n'apparaît qu'une fois par appareil et non à
//! chaque démarrage de Rem.

use std::fs;
use std::net::IpAddr;
use std::path::{Path, PathBuf};

/// Certificat et clé au format PEM, prêts pour rustls.
pub struct Identity {
    pub cert_pem: Vec<u8>,
    pub key_pem: Vec<u8>,
    /// SHA-256 du certificat DER, en hexadécimal séparé par des deux-points.
    ///
    /// Affichée par l'hôte pour qu'un utilisateur méfiant puisse la comparer à
    /// celle que montre son navigateur. C'est la seule parade au MITM à la
    /// première connexion, un certificat auto-signé n'étant vérifiable par
    /// aucune autorité.
    pub fingerprint: String,
}

/// Ce que l'on conserve à côté du certificat pour ne pas avoir à le relire.
#[derive(serde::Serialize, serde::Deserialize, Default)]
struct Meta {
    names: Vec<String>,
    fingerprint: String,
}

fn fingerprint_of(der: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(der);
    digest
        .iter()
        .map(|b| format!("{b:02X}"))
        .collect::<Vec<_>>()
        .join(":")
}

/// Noms pour lesquels le certificat est valide.
///
/// Toutes les IPv4 locales y passent : la machine peut avoir plusieurs
/// interfaces (Wi-Fi, Ethernet, machine virtuelle) et le téléphone se
/// connectera par l'une d'elles.
fn subject_names() -> Vec<String> {
    let mut names = vec!["localhost".to_string(), "127.0.0.1".to_string()];
    if let Ok(list) = local_ip_address::list_afinet_netifas() {
        for (_, ip) in list {
            if let IpAddr::V4(v4) = ip {
                if !v4.is_loopback() {
                    let s = v4.to_string();
                    if !names.contains(&s) {
                        names.push(s);
                    }
                }
            }
        }
    }
    names
}

fn read_meta(path: &Path) -> Meta {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Meta>(&s).ok())
        .unwrap_or_default()
}

/// Charge le certificat du dossier, ou en génère un nouveau.
///
/// Régénère aussi lorsque l'adresse IP de la machine a changé : un certificat
/// qui ne couvre pas le nom demandé provoque un échec net côté navigateur,
/// que l'utilisateur ne peut pas contourner. Mieux vaut un nouvel
/// avertissement, contournable, qu'une connexion impossible.
pub fn load_or_create(dir: &Path) -> Result<Identity, String> {
    let cert_path = dir.join("cert.pem");
    let key_path = dir.join("key.pem");
    let meta_path = dir.join("cert-meta.json");

    let wanted = subject_names();

    if cert_path.exists() && key_path.exists() {
        let meta = read_meta(&meta_path);
        if !meta.fingerprint.is_empty() && wanted.iter().all(|n| meta.names.contains(n)) {
            if let (Ok(cert_pem), Ok(key_pem)) = (fs::read(&cert_path), fs::read(&key_path)) {
                return Ok(Identity {
                    cert_pem,
                    key_pem,
                    fingerprint: meta.fingerprint,
                });
            }
        } else {
            eprintln!("tls: adresse locale absente du certificat, regeneration");
        }
    }

    let certified = rcgen::generate_simple_self_signed(wanted.clone())
        .map_err(|e| format!("tls: generation du certificat: {e}"))?;
    let fingerprint = fingerprint_of(certified.cert.der());
    let cert_pem = certified.cert.pem().into_bytes();
    let key_pem = certified.signing_key.serialize_pem().into_bytes();

    fs::create_dir_all(dir).map_err(|e| format!("tls: creation de {}: {e}", dir.display()))?;
    fs::write(&cert_path, &cert_pem).map_err(|e| format!("tls: ecriture du certificat: {e}"))?;
    fs::write(&key_path, &key_pem).map_err(|e| format!("tls: ecriture de la cle: {e}"))?;
    let meta = Meta {
        names: wanted,
        fingerprint: fingerprint.clone(),
    };
    let _ = fs::write(&meta_path, serde_json::to_string(&meta).unwrap_or_default());

    // La clé privée ne doit pas être lisible par les autres comptes.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600));
    }

    Ok(Identity {
        cert_pem,
        key_pem,
        fingerprint,
    })
}

/// Dossier où déposer le certificat, sous le répertoire de données de l'app.
pub fn dir_for(app_data: PathBuf) -> PathBuf {
    app_data.join("tls")
}
