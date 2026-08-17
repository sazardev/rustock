import { Navigate } from "react-router";
import { PATH } from "../app/route-paths";
import { useSession } from "../shared/session";
import { Badge, ButtonLink, Card, Icon, Link, LogoMark, Text } from "../shared/ui";
import { ESTADISTICAS, FEATURES, PASOS, PRINCIPIOS } from "./landing/data";
import { Mockup } from "./landing/Mockup";
import { Reveal } from "./landing/Reveal";

export function LandingPage() {
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);

  if (cargandoSesion) {
    return null;
  }
  if (usuario) {
    return <Navigate to={PATH.dashboard} replace />;
  }

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__container landing__header-inner">
          <Link href="/" className="landing__brand-link" ariaLabel="Rustock, inicio">
            <LogoMark size={28} />
            <span className="landing__brand-name">Rustock</span>
          </Link>
          <nav className="landing__nav" aria-label="Secciones de la página">
            <div className="landing__nav-links">
              <a className="landing__nav-link" href="#caracteristicas">
                Características
              </a>
              <a className="landing__nav-link" href="#como-funciona">
                Cómo funciona
              </a>
              <a className="landing__nav-link" href="#integridad">
                Integridad
              </a>
            </div>
            <ButtonLink variant="primary" href={PATH.login}>
              Iniciar sesión
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="landing__hero">
          <div className="landing__container">
            <div className="landing__hero-item">
              <span className="landing__hero-badge">
                <Badge tone="info" icon="almacen">
                  Self-hosted
                </Badge>
              </span>
            </div>
            <h1 className="landing__hero-title landing__hero-item landing__hero-item--1">
              Tu almacén, <span className="landing__hero-accent">bajo control</span>
            </h1>
            <p className="landing__lead landing__hero-item landing__hero-item--2">
              Rustock administra productos, lotes, ubicaciones y movimientos en una sola aplicación.
              Se instala en tu equipo, corre completo en tu infraestructura y registra cada hecho de
              stock con su autor y su motivo.
            </p>
            <div className="landing__cta landing__hero-item landing__hero-item--3">
              <ButtonLink variant="primary" href={PATH.login}>
                Iniciar sesión
              </ButtonLink>
              <ButtonLink variant="secondary" href={PATH.configurarAdministrador}>
                Configurar el administrador
              </ButtonLink>
            </div>

            {/* Maqueta del producto */}
            <div className="landing__mock-stage landing__hero-item landing__hero-item--4">
              <div className="landing__mock-chip landing__mock-chip--top">
                <Icon
                  name="lote"
                  size={14}
                  className="landing__mock-chip-icon"
                  aria-hidden="true"
                />
                FEFO automático
              </div>
              <div className="landing__mock-chip landing__mock-chip--bottom">
                <Icon
                  name="caja"
                  size={14}
                  className="landing__mock-chip-icon"
                  aria-hidden="true"
                />
                Saldos materializados
              </div>
              <Mockup />
            </div>
          </div>
        </section>

        {/* Estadísticas — banda oscura */}
        <section className="landing__section landing__section--dark">
          <div className="landing__container">
            <span className="landing__eyebrow">Una sola instalación</span>
            <h2 className="landing__section-title">Tu operación completa en un solo lugar</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              Sin suscripciones, sin nube, sin piezas móviles: una aplicación, un archivo, control
              total.
            </Text>
            <div className="landing__stats">
              {ESTADISTICAS.map((stat, index) => (
                <Reveal key={stat.etiqueta} delay={index * 70} className="landing__stat">
                  <span className="landing__stat-valor">{stat.valor}</span>
                  <span className="landing__stat-etiqueta">{stat.etiqueta}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Características */}
        <section id="caracteristicas" className="landing__section">
          <div className="landing__container">
            <span className="landing__eyebrow">Características</span>
            <h2 className="landing__section-title">Todo lo que necesita un almacén</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              Seis capacidades que trabajan juntas para que el stock registrado coincida con el
              stock físico.
            </Text>
            <div className="landing__grid">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={(index % 3) * 70} className="landing__grid-item">
                  <Card className="landing__feature">
                    <Card.Body>
                      <div className="landing__feature-icon">
                        <Icon name={feature.icon} size={20} aria-hidden="true" />
                      </div>
                      <h3 className="landing__feature-title">{feature.title}</h3>
                      <Text as="p" size="sm" color="muted" className="landing__feature-text">
                        {feature.text}
                      </Text>
                    </Card.Body>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="landing__section landing__section--white">
          <div className="landing__container">
            <span className="landing__eyebrow">Cómo funciona</span>
            <h2 className="landing__section-title">De la instalación al control en tres pasos</h2>
            <div className="landing__pasos">
              {PASOS.map((paso, index) => (
                <Reveal key={paso.title} delay={index * 90} className="landing__paso">
                  <span className="landing__paso-numero">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="landing__paso-titulo">
                    <span className="landing__paso-icono">
                      <Icon name={paso.icon} size={16} aria-hidden="true" />
                    </span>
                    {paso.title}
                  </h3>
                  <Text as="p" size="sm" color="muted" className="landing__paso-text">
                    {paso.text}
                  </Text>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Principios */}
        <section id="integridad" className="landing__section landing__section--tinted">
          <div className="landing__container">
            <span className="landing__eyebrow">Integridad</span>
            <h2 className="landing__section-title">Cuatro reglas que no se negocian</h2>
            <div className="landing__principles">
              {PRINCIPIOS.map((principio, index) => (
                <Reveal
                  key={principio.title}
                  delay={(index % 4) * 70}
                  className="landing__grid-item"
                >
                  <div className="landing__principle">
                    <span className="landing__principle-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="landing__principle-title">{principio.title}</h3>
                    <Text as="p" size="sm" color="muted">
                      {principio.text}
                    </Text>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="landing__section landing__section--dark landing__cta-final">
          <div className="landing__container">
            <div className="landing__cta-final-logo">
              <LogoMark size={64} />
            </div>
            <h2 className="landing__section-title">¿Listo para tomar el control?</h2>
            <Text as="p" size="lg" className="landing__cta-final-desc">
              Configura el primer usuario administrador y empieza a operar en minutos. Tus datos se
              quedan contigo: SQLite embebido, sin dependencias en la nube.
            </Text>
            <div className="landing__cta">
              <ButtonLink variant="primary" href={PATH.configurarAdministrador}>
                Configurar el administrador
              </ButtonLink>
              <ButtonLink variant="secondary" href={PATH.login}>
                Iniciar sesión
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__container landing__footer-inner">
          <span className="landing__footer-brand">
            <LogoMark size={20} />
            <span>Rustock</span>
          </span>
          <Text as="span" size="xs" color="muted">
            Self-hosted — SQLite embebido — Rust y React
          </Text>
        </div>
      </footer>
    </div>
  );
}
