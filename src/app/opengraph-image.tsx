import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Native Waters — Indian rivers and native freshwater fishes';

export default function Image() {
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
            top: '-190px',
            right: '-150px',
            width: '640px',
            height: '640px',
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
              width: '470px',
              height: '470px',
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
                width: '300px',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(143, 179, 171, 0.08)',
                border: '1px solid rgba(143, 179, 171, 0.2)',
              }}
            >
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  display: 'flex',
                  borderRadius: '50%',
                  background: 'rgba(232, 241, 238, 0.07)',
                  border: '1px solid rgba(232, 241, 238, 0.18)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Water motif echo, bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-120px',
            width: '380px',
            height: '380px',
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
              width: '230px',
              height: '230px',
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
          {/* Eyebrow */}
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
              FRESHWATER REFERENCE
            </div>
          </div>

          {/* Title block */}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '900px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '96px',
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-1px',
                color: '#e8f1ee',
              }}
            >
              Native Waters
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: '22px',
                fontSize: '40px',
                fontWeight: 400,
                lineHeight: 1.25,
                color: '#8fb3ab',
                maxWidth: '780px',
              }}
            >
              Indian rivers &amp; native freshwater fishes
            </div>
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
              discovernativewaters.com
            </div>
          </div>
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
