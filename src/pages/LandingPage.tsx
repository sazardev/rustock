import { useState } from "react";
import { Navigate } from "react-router";
import { PATH } from "../app/route-paths";
import { useSession } from "../shared/session";
import { Badge, ButtonLink, Card, Icon, Link, LogoMark, Text } from "../shared/ui";
import { Seo, jsonLdBreadcrumb, jsonLdFaq } from "../shared/seo";
import {
  COMPARATIVA,
  ESTADISTICAS,
  FAQS,
  FEATURES,
  PASOS,
  PLANES,
  PRINCIPIOS,
  TESTIMONIOS,
} from "./landing/data";
import { Mockup } from "./landing/Mockup";
import { Reveal } from "./landing/Reveal";

function FaqItem({
  pregunta,
  respuesta,
  abierta,
  onToggle,
}: {
  pregunta: string;
  respuesta: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`landing__faq-item ${abierta ? "landing__faq-item--abierta" : ""}`}>
      <button
        type="button"
        className="landing__faq-pregunta"
        onClick={onToggle}
        aria-expanded={abierta}
      >
        <span>{pregunta}</span>
        <Icon
          name={abierta ? "bajar" : "subir"}
          size={16}
          className="landing__faq-icono"
          aria-hidden="true"
        />
      </button>
      {abierta ? <p className="landing__faq-respuesta">{respuesta}</p> : null}
    </div>
  );
}

export function LandingPage() {
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const [faqAbierta, setFaqAbierta] = useState<number>(0);

  if (cargandoSesion) {
    return null;
  }
  if (usuario) {
    return <Navigate to={PATH.dashboard} replace />;
  }

  const faqJsonLd = jsonLdFaq(FAQS.map((f) => ({ pregunta: f.pregunta, respuesta: f.respuesta })));
  const breadcrumbJsonLd = jsonLdBreadcrumb([{ name: "Inicio", url: "https://rustock.app/" }]);
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Rustock",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    description:
      "WMS self-hosted todo en uno: stock en tiempo real, lotes con FIFO/FEFO, trazabilidad inmutable y sin nube.",
    url: "https://rustock.app",
    image: "https://rustock.app/og-image.png",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "5.0", ratingCount: "1" },
    author: { "@type": "Organization", name: "Rustock", url: "https://rustock.app" },
  };

  return (
    <div className="landing">
      <Seo
        title="Rustock — WMS self-hosted para control total de tu almacén"
        description="WMS self-hosted todo en uno: stock en tiempo real, lotes con FIFO/FEFO, trazabilidad inmutable y sin nube. Una instalación, un archivo. Tu almacén bajo control."
        jsonLd={[breadcrumbJsonLd, softwareJsonLd, faqJsonLd]}
      />

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
              <a className="landing__nav-link" href="#comparativa">
                Comparativa
              </a>
              <a className="landing__nav-link" href="#como-funciona">
                Cómo funciona
              </a>
              <a className="landing__nav-link" href="#precios">
                Precios
              </a>
              <a className="landing__nav-link" href="#faq">
                FAQ
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
                  Self-hosted — sin nube
                </Badge>
              </span>
            </div>
            <h1 className="landing__hero-title landing__hero-item landing__hero-item--1">
              Tu almacén, <span className="landing__hero-accent">bajo control</span>
            </h1>
            <p className="landing__lead landing__hero-item landing__hero-item--2">
              Rustock administra productos, lotes, ubicaciones y movimientos en una sola aplicación.
              Se instala en tu equipo, corre completo en tu infraestructura y registra cada hecho de
              stock con su autor y su motivo. <strong>Deja Excel. Toma el control.</strong>
            </p>
            <div className="landing__cta landing__hero-item landing__hero-item--3">
              <ButtonLink variant="primary" href={PATH.configurarAdministrador}>
                Configurar el administrador
              </ButtonLink>
              <ButtonLink variant="secondary" href="#caracteristicas">
                Ver características
              </ButtonLink>
            </div>
            <p className="landing__hero-nota landing__hero-item landing__hero-item--3">
              <Icon name="aprobar" size={14} aria-hidden="true" /> Sin tarjeta &middot; Instalación
              en minutos &middot; Tus datos nunca salen de tu equipo
            </p>

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

        {/* Comparativa rompedora */}
        <section id="comparativa" className="landing__section landing__section--white">
          <div className="landing__container">
            <span className="landing__eyebrow">Por qué Rustock</span>
            <h2 className="landing__section-title">
              Excel te frena. El SaaS te alquila. Rustock te da la propiedad.
            </h2>
            <Text as="p" size="lg" className="landing__section-desc">
              La comparativa honesta. Sin asteriscos.
            </Text>
            <div className="landing__table-wrap">
              <table
                className="landing__table"
                aria-label="Comparativa Rustock frente a Excel y SaaS"
              >
                <thead>
                  <tr>
                    <th scope="col">Criterio</th>
                    <th scope="col" className="landing__table-head--rustock">
                      <span className="landing__table-badge">Rustock</span>
                    </th>
                    <th scope="col">Excel</th>
                    <th scope="col">SaaS típico</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((fila) => (
                    <tr key={fila.caracteristica}>
                      <th scope="row">{fila.caracteristica}</th>
                      <td className={fila.destaqueRustock ? "landing__table-cell--destacada" : ""}>
                        {fila.rustock}
                      </td>
                      <td>{fila.excel}</td>
                      <td>{fila.saas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="landing__comparativa-cta">
              <Text as="p" size="sm" color="muted">
                Un binario nativo en Rust. Sin vendor lock-in. Sin sorpresas en la factura.
              </Text>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="landing__section landing__section--tinted">
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

        {/* Pricing / Valor */}
        <section id="precios" className="landing__section landing__section--white">
          <div className="landing__container">
            <span className="landing__eyebrow">Valor</span>
            <h2 className="landing__section-title">Un precio honesto: el tuyo</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              Rustock es tuyo. No pagas por usuario, por mes ni por escanear un código. Elige cómo
              empezar.
            </Text>
            <div className="landing__planes">
              {PLANES.map((plan) => (
                <Card
                  key={plan.nombre}
                  className={`landing__plan ${plan.destacado ? "landing__plan--destacado" : ""}`}
                >
                  <Card.Body>
                    {plan.destacado ? (
                      <Badge tone="info" className="landing__plan-badge">
                        Recomendado
                      </Badge>
                    ) : null}
                    <h3 className="landing__plan-nombre">{plan.nombre}</h3>
                    <div className="landing__plan-precio">
                      <span className="landing__plan-cifra">{plan.precio}</span>
                      <span className="landing__plan-periodo">{plan.periodo}</span>
                    </div>
                    <Text as="p" size="sm" color="muted" className="landing__plan-desc">
                      {plan.descripcion}
                    </Text>
                    <ul className="landing__plan-lista">
                      {plan.incluye.map((item) => (
                        <li key={item} className="landing__plan-item">
                          <Icon
                            name="aprobar"
                            size={14}
                            className="landing__plan-check"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <ButtonLink
                      variant={plan.cta.variante}
                      href={plan.cta.href}
                      className="landing__plan-cta"
                    >
                      {plan.cta.etiqueta}
                    </ButtonLink>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonios */}
        <section className="landing__section landing__section--dark">
          <div className="landing__container">
            <span className="landing__eyebrow">Prueba social</span>
            <h2 className="landing__section-title">Operaciones que ya tomaron el control</h2>
            <div className="landing__testimonios">
              {TESTIMONIOS.map((t) => (
                <div key={t.autor} className="landing__testimonio">
                  <p className="landing__testimonio-cita">“{t.cita}”</p>
                  <div className="landing__testimonio-autor">
                    <span className="landing__testimonio-avatar" aria-hidden="true">
                      {t.inicial}
                    </span>
                    <span className="landing__testimonio-meta">
                      <span className="landing__testimonio-nombre">{t.autor}</span>
                      <span className="landing__testimonio-cargo">{t.cargo}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="landing__section">
          <div className="landing__container">
            <span className="landing__eyebrow">Preguntas frecuentes</span>
            <h2 className="landing__section-title">
              Lo que todos preguntan antes de tomar el control
            </h2>
            <div className="landing__faq">
              {FAQS.map((faq, index) => (
                <FaqItem
                  key={faq.pregunta}
                  pregunta={faq.pregunta}
                  respuesta={faq.respuesta}
                  abierta={faqAbierta === index}
                  onToggle={() => setFaqAbierta(faqAbierta === index ? -1 : index)}
                />
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
              quedan contigo: SQLite embebido, sin dependencias en la nube.{" "}
              <strong>Sin tarjeta. Sin nube. Sin límites.</strong>
            </Text>
            <div className="landing__cta">
              <ButtonLink variant="primary" href={PATH.configurarAdministrador}>
                Configurar el administrador
              </ButtonLink>
              <ButtonLink variant="secondary" href={PATH.login}>
                Iniciar sesión
              </ButtonLink>
            </div>
            <p className="landing__cta-nota">
              Instalación en minutos &middot; Documentación de 26 guías &middot; Soporte vía
              glosario y ayuda
            </p>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__container landing__footer-inner">
          <div className="landing__footer-col">
            <span className="landing__footer-brand">
              <LogoMark size={20} />
              <span>Rustock</span>
            </span>
            <Text as="p" size="xs" color="muted" className="landing__footer-tagline">
              WMS self-hosted. Tu almacén, bajo control.
            </Text>
          </div>
          <nav className="landing__footer-nav" aria-label="Enlaces del pie">
            <a href="#caracteristicas">Características</a>
            <a href="#comparativa">Comparativa</a>
            <a href="#faq">FAQ</a>
            <a href="/ayuda">Ayuda</a>
            <a href="/ayuda/glosario">Glosario</a>
          </nav>
          <Text as="span" size="xs" color="muted">
            Self-hosted — SQLite — Rust + React — Hecho para durar
          </Text>
        </div>
      </footer>
    </div>
  );
}
