/* eslint-disable @next/next/no-img-element -- לוגו שהיועץ העלה, מוגש מ-/api/site-images */
import { MessageCircle, Phone } from 'lucide-react';
import { telHref, whatsappHref, type PublicOffice } from '@/lib/office';
import { officeStyle } from './officeTheme';
import { OfficeAvatar } from './OfficeAvatar';

/**
 * המשרד של היועץ בראש האזור האישי של הלקוח, במקום הסמל של משכלנתא: הלוגו או
 * התמונה, שם המשרד, מי היועץ, וקיצורי דרך לוואטסאפ ולטלפון שלו.
 */
export function ClientOfficeBrand({ office, variant }: { office: PublicOffice; variant: 'sidebar' | 'bar' }) {
  const { profile } = office;
  const advisor = profile.advisorName || office.name;

  if (variant === 'bar') {
    return (
      <span style={officeStyle(profile.color)} className="start-aligned flex min-w-0 items-center gap-2">
        <OfficeAvatar name={advisor} photoUrl={profile.photoUrl} size="sm" className="h-8 w-8" />
        <span className="truncate text-base font-black text-white">{office.name}</span>
      </span>
    );
  }

  const whatsapp = whatsappHref(profile.whatsapp);
  const phone = telHref(profile.phone);
  return (
    <div style={officeStyle(profile.color)} className="start-aligned rounded-2xl bg-white/5 p-3">
      {profile.logoUrl && (
        <span className="mb-3 flex h-12 items-center justify-center rounded-xl bg-white px-3">
          <img src={profile.logoUrl} alt={office.name} className="max-h-9 w-auto max-w-full object-contain" />
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <OfficeAvatar name={advisor} photoUrl={profile.photoUrl} size="sm" className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{profile.logoUrl ? advisor : office.name}</p>
          <p className="truncate text-xs text-white/60">
            {profile.logoUrl ? profile.advisorTitle : `היועץ שלכם: ${advisor}`}
          </p>
        </div>
      </div>
      {(whatsapp || phone) && (
        <div className="mt-3 flex gap-2">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/20"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              וואטסאפ
            </a>
          )}
          {phone && (
            <a
              href={phone}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/20"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              התקשרות
            </a>
          )}
        </div>
      )}
    </div>
  );
}
