import { useId } from "react";

/**
 * Logo de Rem : un toucher sur le trackpad, en relief.
 *
 * Même géométrie que `gen_icon.py`, qui produit les icônes de l'app — les
 * deux doivent rester d'accord. Vectoriel ici plutôt qu'une image : net à
 * toutes les tailles, sans requête réseau.
 */
export function RemMark({ className }: { className?: string }) {
  // Un identifiant par instance : deux logos sur la même page partageraient
  // sinon le même masque de découpe. `useId` renvoie des caractères comme
  // « : » ou « « » », mal tolérés dans un `url(#…)` : on ne garde que le sûr.
  const clip = "rem-mark-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect width="120" height="120" rx="28" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="120" height="120" fill="#6D28D9" />
        <ellipse cx="60" cy="-12" rx="92" ry="54" fill="#7C3AED" />
        <circle cx="60" cy="60" r="42" fill="none" stroke="#C4B5FD" strokeWidth="4" />
        <circle cx="60" cy="60" r="26" fill="none" stroke="#E9D5FF" strokeWidth="7" />
        <circle cx="64" cy="65" r="12" fill="#4C1D95" />
        <circle cx="60" cy="60" r="12" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
