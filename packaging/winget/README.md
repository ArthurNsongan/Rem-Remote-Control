# Publication de Rem sur winget

`winget` est le gestionnaire de paquets officiel de Windows. Y figurer rend Rem
installable par `winget install ArthurNsongan.Rem`, gratuitement et sans compte
développeur. Cela **ne supprime pas** l'avertissement SmartScreen : winget se
contente de télécharger le `.msi`, qui reste non signé.

Les manifestes de ce dossier sont la source de vérité. On les copie tels quels
dans une pull request vers [microsoft/winget-pkgs][repo].

[repo]: https://github.com/microsoft/winget-pkgs

## Première soumission

1. Forker `microsoft/winget-pkgs`, puis cloner le fork.
2. Copier le dossier de version dans le fork, en respectant l'arborescence :

   ```
   manifests/a/ArthurNsongan/Rem/<version>/
   ```

3. Valider les manifestes en local avant d'ouvrir la PR :

   ```powershell
   winget validate --manifest manifests\a\ArthurNsongan\Rem\<version>
   winget install --manifest manifests\a\ArthurNsongan\Rem\<version>
   ```

   La seconde commande installe réellement le paquet : c'est ce que demande la
   checklist de la PR, et c'est ce qui attrape les erreurs de `ProductCode` ou
   de mode d'installation silencieux.

4. Ouvrir la pull request. Un bot lance la validation automatique, puis un
   humain relit. Compter quelques jours.

## À chaque nouvelle version

Trois champs seulement changent. Le reste est stable.

| Champ | Où | Comment l'obtenir |
| --- | --- | --- |
| `PackageVersion` | les 4 fichiers | le numéro de version |
| `InstallerUrl` | `.installer.yaml` | URL de l'asset `.msi` de la release |
| `InstallerSha256` | `.installer.yaml` | voir ci-dessous |
| `ProductCode` | `.installer.yaml` | voir ci-dessous |
| `ReleaseDate` | `.installer.yaml` | date de publication de la release |

Empreinte de l'installeur :

```powershell
$url = "https://github.com/ArthurNsongan/Rem-Remote-Control/releases/download/v<version>/Rem_<version>_x64_en-US.msi"
Invoke-WebRequest $url -OutFile rem.msi
(Get-FileHash rem.msi -Algorithm SHA256).Hash
```

`ProductCode` du `.msi` (il change à chaque version, contrairement à
l'`UpgradeCode`) :

```powershell
$inst = New-Object -ComObject WindowsInstaller.Installer
$db = $inst.GetType().InvokeMember("OpenDatabase","InvokeMethod",$null,$inst,@("$PWD\rem.msi",0))
$v = $db.GetType().InvokeMember("OpenView","InvokeMethod",$null,$db,@("SELECT Value FROM Property WHERE Property='ProductCode'"))
$v.GetType().InvokeMember("Execute","InvokeMethod",$null,$v,$null)
$r = $v.GetType().InvokeMember("Fetch","InvokeMethod",$null,$v,$null)
$r.GetType().InvokeMember("StringData","GetProperty",$null,$r,1)
```

## Relevés de la 0.1.10

Conservés ici pour référence, ils viennent de l'asset publié :

- `InstallerSha256` : `96E092A2FD7179ED2F3E7D10B36033CC4D976A7916783C2369D68579DBDEA4FE`
- `ProductCode` : `{024271BB-02F3-47A4-B6F2-BE9A9352640B}`
- `UpgradeCode` : `{AAF67E0F-F2A2-5F38-AA71-2991D406BAC2}` (stable d'une version à l'autre)
