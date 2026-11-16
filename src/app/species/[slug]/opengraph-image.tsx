import { ImageResponse } from 'next/og';
import { freshwaterCatalog } from '@/lib/catalog';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Freshwater fish profile — Native Waters';
export function generateStaticParams() { return freshwaterCatalog.species.map(species => ({ slug: species.id })); }

/** Trim to the last whole word that fits inside the limit. */
function truncate(text: string, limit = 140) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const whole = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\u2013\u2014-]+$/, '');
  return `${whole}\u2026`;
}

function humanize(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const species = freshwaterCatalog.species.find(record => record.id === slug);

  const association = species?.associations?.[0];
  const river = association
    ? freshwaterCatalog.rivers.find(record => record.id === association.riverId)
    : undefined;

  let badge: string | null = null;
  if (association) {
    const status =
      association.status === 'native'
        ? 'Native'
        : association.status === 'introduced'
          ? 'Introduced'
          : association.status === 'uncertain'
            ? 'Uncertain'
            : null;
    if (status && river) {
      if (status === 'Native' && association.basinEndemic) {
        badge = `Native to the ${river.name} basin \u00b7 endemic`;
      } else if (status === 'Uncertain') {
        badge = `Uncertain record in the ${river.name} basin`;
      } else {
        badge = `${status} to the ${river.name} basin`;
      }
    } else if (status) {
      badge = `${status} record`;
    }
  }

  const title = species ? species.commonName : 'Native Waters';
  const scientificName =
    species && species.scientificName !== species.commonName ? species.scientificName : null;
  const subtitle = scientificName ?? (species ? null : humanize(slug || 'Unknown species'));
  const body = species ? truncate(species.summary) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          padding: '72px',
          background: 'linear-gradient(135deg, #101c1e 0%, #0e3b3f 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Water motif: translucent concentric rings, top right */}
        <div
          style={{
            position: 'absolute',
            top: '-170px',
            right: '-140px',
            width: '600px',
            height: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(143, 179, 171, 0.08)',
            border: '1px solid rgba(143, 179, 171, 0.22)',
          }}
        >
          <div
            style={{
              width: '430px',
              height: '430px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'rgba(143, 179, 171, 0.07)',
              border: '1px solid rgba(143, 179, 171, 0.2)',
            }}
          >
            <div
              style={{
                width: '260px',
                height: '260px',
                display: 'flex',
                borderRadius: '50%',
                background: 'rgba(232, 241, 238, 0.06)',
                border: '1px solid rgba(232, 241, 238, 0.16)',
              }}
            />
          </div>
        </div>

        {/* Water motif echo, bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-160px',
            left: '-130px',
            width: '400px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(143, 179, 171, 0.05)',
            border: '1px solid rgba(143, 179, 171, 0.14)',
          }}
        >
          <div
            style={{
              width: '240px',
              height: '240px',
              display: 'flex',
              borderRadius: '50%',
              background: 'rgba(143, 179, 171, 0.05)',
              border: '1px solid rgba(143, 179, 171, 0.12)',
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Eyebrow + evidence badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  borderRadius: '50%',
                  backgroundColor: '#8fb3ab',
                  marginRight: '16px',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: '22px',
                  fontWeight: 600,
                  letterSpacing: '4px',
                  color: '#5f7d78',
                }}
              >
                SPECIES PROFILE
              </div>
            </div>
            {badge ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '18px',
                  padding: '8px 20px',
                  borderRadius: '999px',
                  border: '1px solid rgba(143, 179, 171, 0.4)',
                  background: 'rgba(143, 179, 171, 0.12)',
                  fontSize: '22px',
                  fontWeight: 500,
                  color: '#b9d2cb',
                }}
              >
                {badge}
              </div>
            ) : null}
          </div>

          {/* Title block */}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '930px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '80px',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-1px',
                color: '#e8f1ee',
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '14px',
                  fontSize: '36px',
                  fontWeight: 400,
                  fontStyle: species ? 'italic' : 'normal',
                  lineHeight: 1.25,
                  color: '#8fb3ab',
                }}
              >
                {subtitle}
              </div>
            ) : null}
            {body ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '24px',
                  fontSize: '28px',
                  fontWeight: 400,
                  lineHeight: 1.45,
                  color: '#a9c4bd',
                  maxWidth: '870px',
                }}
              >
                {body}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: '120px',
                height: '2px',
                display: 'flex',
                backgroundColor: 'rgba(143, 179, 171, 0.45)',
                marginBottom: '20px',
              }}
            />
            <div style={{ display: 'flex', fontSize: '28px', color: '#5f7d78' }}>
              {'Native Waters \u00b7 discovernativewaters.com'}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
