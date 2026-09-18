import { Lock, LockOpen, Minus, Plus } from "lucide-react";
import { useT } from "../i18n";
import { otherModeUrl, type PublicInfo } from "../lib/socket";

/**
 * Propose à l'utilisateur de basculer entre connexion standard et chiffrée.
 *
 * Les deux modes sont présentés comme des choix, jamais comme un défaut et un
 * correctif : parler de connexion « non sécurisée » ferait croire que Rem est
 * douteux, alors que le trafic ne quitte pas le réseau local dans les deux cas.
 * Chacun affiche son avantage et son inconvénient — un choix sans ses deux
 * faces n'en est pas un.
 */
export default function ConnectionMode({ pub }: { pub: PublicInfo }) {
  const t = useT();
  if (!pub.secure_available) return null;

  const pro = pub.secure ? t("conn_secure_pro") : t("conn_standard_pro");
  const con = pub.secure ? t("conn_secure_con") : t("conn_standard_con");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary-foreground">
          {pub.secure ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs font-medium">
          {pub.secure ? t("conn_on_secure") : t("conn_on_standard")}
        </span>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-foreground/75">
        <Plus className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
        <span>{pro}</span>
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Minus className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
        <span>{con}</span>
      </p>

      <button
        onClick={() => {
          window.location.href = otherModeUrl(pub.secure);
        }}
        className="mt-2.5 w-full rounded-lg border border-white/15 bg-white/[0.05] py-1.5 text-[11px] font-medium transition-colors hover:bg-white/[0.1]"
      >
        {pub.secure ? t("conn_to_standard") : t("conn_to_secure")}
      </button>
    </div>
  );
}
