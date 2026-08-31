import { useState } from "react";
import { Navigate } from "react-router";
import { PATH } from "../app/route-paths";
import { useSession } from "../shared/session";
import { Badge, ButtonLink, Card, Icon, Link, LogoMark, Text } from "../shared/ui";
import { Seo, jsonLdBreadcrumb, jsonLdFaq } from "../shared/seo";
import {
  comparativaDe,
  confianzaDe,
  doloresDe,
  estadisticasDe,
  faqsDe,
  featuresDe,
  pasosDe,
  planesDe,
  principiosDe,
  stackDe,
  testimoniosDe,
} from "./landing/data";
import { Mockup } from "./landing/Mockup";
import { Reveal } from "./landing/Reveal";
import { useT } from "../shared/i18n";

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
  const t = useT();
  const usuario = useSession((s) => s.usuario);
  const cargandoSesion = useSession((s) => s.cargando);
  const [faqAbierta, setFaqAbierta] = useState<number>(0);

  if (cargandoSesion) {
    return null;
  }
  if (usuario) {
    return <Navigate to={PATH.dashboard} replace />;
  }

  const faqJsonLd = jsonLdFaq(
    faqsDe(t).map((f) => ({ pregunta: f.pregunta, respuesta: f.respuesta })),
  );
  const breadcrumbJsonLd = jsonLdBreadcrumb([{ name: "Inicio", url: "https://rustock.app/" }]);
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Rustock",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: t.seo.aplicacionDesc,
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
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t.landing.pagina.pasosAria,
    totalTime: "PT10M",
    step: pasosDe(t).map((p, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: p.title,
      text: p.text,
    })),
  };

  return (
    <div className="landing">
      <Seo
        title={t.seo.landingTitulo}
        description={t.seo.landingDesc}
        jsonLd={[breadcrumbJsonLd, softwareJsonLd, faqJsonLd, howToJsonLd]}
      />

      <header className="landing__header">
        <div className="landing__container landing__header-inner">
          <Link href="/" className="landing__brand-link" ariaLabel="Rustock, inicio">
            <LogoMark size={28} />
            <span className="landing__brand-name">Rustock</span>
          </Link>
          <nav className="landing__nav" aria-label={t.landing.pagina.seccionesAria}>
            <div className="landing__nav-links">
              <a className="landing__nav-link" href="#caracteristicas">
                {t.landing.pagina.navCaracteristicas}
              </a>
              <a className="landing__nav-link" href="#comparativa">
                {t.landing.pagina.navComparativa}
              </a>
              <a className="landing__nav-link" href="#como-funciona">
                {t.landing.pagina.navComoFunciona}
              </a>
              <a className="landing__nav-link" href="#precios">
                {t.landing.pagina.navPrecios}
              </a>
              <a className="landing__nav-link" href="#faq">
                FAQ
              </a>
            </div>
            <ButtonLink variant="primary" href={PATH.login}>
              {t.landing.pagina.iniciarSesion}
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — obsesivo en tipografía y prueba */}
        <section className="landing__hero">
          <div className="landing__container">
            <div className="landing__hero-item">
              <span className="landing__hero-badge">
                <Badge tone="info" icon="almacen">
                  {t.landing.pagina.heroBadge}
                </Badge>
              </span>
            </div>
            <h1 className="landing__hero-title landing__hero-item landing__hero-item--1">
              {t.landing.pagina.heroTitulo1}
              <span className="landing__hero-accent">{t.landing.pagina.heroTituloAcento}</span>
              <span className="landing__hero-sub">{t.landing.pagina.heroTitulo2}</span>
            </h1>
            <p className="landing__lead landing__hero-item landing__hero-item--2">
              {t.landing.pagina.heroLead} <strong>{t.landing.pagina.heroLeadFuerte}</strong>
            </p>
            <div className="landing__cta landing__hero-item landing__hero-item--3">
              <ButtonLink variant="primary" href={PATH.configurarAdministrador}>
                {t.landing.pagina.ctaAdminGratis}
              </ButtonLink>
              <ButtonLink variant="secondary" href="#caracteristicas">
                {t.landing.pagina.verCaracteristicas}
              </ButtonLink>
            </div>
            <p className="landing__hero-nota landing__hero-item landing__hero-item--3">
              <Icon name="aprobar" size={14} aria-hidden="true" /> {t.landing.pagina.heroNota}
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
                {t.landing.pagina.chipFefo}
              </div>
              <div className="landing__mock-chip landing__mock-chip--bottom">
                <Icon
                  name="caja"
                  size={14}
                  className="landing__mock-chip-icon"
                  aria-hidden="true"
                />
                {t.landing.pagina.chipSaldos}
              </div>
              <Mockup />
            </div>
          </div>
        </section>

        {/* Confianza — social proof minimalista */}
        <section className="landing__section landing__section--confianza">
          <div className="landing__container">
            <p className="landing__confianza-label">{t.landing.pagina.confianzaLabel}</p>
            <div className="landing__confianza-grid">
              {confianzaDe(t).map((item) => (
                <span key={item} className="landing__confianza-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Dolores */}
        <section className="landing__section">
          <div className="landing__container">
            <span className="landing__eyebrow">{t.landing.pagina.doloresEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.doloresTitulo}</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              {t.landing.pagina.doloresLead}
            </Text>
            <div className="landing__dolores">
              {doloresDe(t).map((dolor) => (
                <Card key={dolor.titulo} className="landing__dolor">
                  <Card.Body>
                    <div className="landing__dolor-icon">
                      <Icon name={dolor.icon} size={18} aria-hidden="true" />
                    </div>
                    <h3 className="landing__dolor-titulo">{dolor.titulo}</h3>
                    <Text as="p" size="sm" color="muted">
                      {dolor.texto}
                    </Text>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Estadísticas — banda oscura */}
        <section className="landing__section landing__section--dark">
          <div className="landing__container">
            <span className="landing__eyebrow">{t.landing.pagina.instalacionEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.instalacionTitulo}</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              {t.landing.pagina.instalacionLead}
            </Text>
            <div className="landing__stats">
              {estadisticasDe(t).map((stat, index) => (
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
            <span className="landing__eyebrow">{t.landing.pagina.navCaracteristicas}</span>
            <h2 className="landing__section-title">{t.landing.pagina.caracteristicasTitulo}</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              {t.landing.pagina.caracteristicasLead}
            </Text>
            <div className="landing__grid">
              {featuresDe(t).map((feature, index) => (
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
            <span className="landing__eyebrow">{t.landing.pagina.comparativaEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.comparativaTitulo}</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              {t.landing.pagina.comparativaLead}
            </Text>
            <div className="landing__table-wrap">
              <table className="landing__table" aria-label={t.landing.pagina.comparativaAria}>
                <thead>
                  <tr>
                    <th scope="col">{t.landing.pagina.colCriterio}</th>
                    <th scope="col" className="landing__table-head--rustock">
                      <span className="landing__table-badge">Rustock</span>
                    </th>
                    <th scope="col">{t.landing.pagina.colExcel}</th>
                    <th scope="col">{t.landing.pagina.colSaas}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativaDe(t).map((fila) => (
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
                {t.landing.pagina.comparativaPie}
              </Text>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="landing__section landing__section--tinted">
          <div className="landing__container">
            <span className="landing__eyebrow">{t.landing.pagina.pasosEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.pasosTitulo}</h2>
            <div className="landing__pasos">
              {pasosDe(t).map((paso, index) => (
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
            <span className="landing__eyebrow">{t.landing.pagina.preciosEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.preciosTitulo}</h2>
            <Text as="p" size="lg" className="landing__section-desc">
              {t.landing.pagina.preciosLead}
            </Text>
            <div className="landing__planes">
              {planesDe(t).map((plan) => (
                <Card
                  key={plan.nombre}
                  className={`landing__plan ${plan.destacado ? "landing__plan--destacado" : ""}`}
                >
                  <Card.Body>
                    {plan.destacado ? (
                      <Badge tone="info" className="landing__plan-badge">
                        {t.landing.pagina.recomendado}
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
            <p className="landing__garantia">
              <Icon name="aprobar" size={14} aria-hidden="true" /> {t.landing.pagina.garantia}
            </p>
          </div>
        </section>

        {/* Stack de confianza */}
        <section className="landing__section landing__section--stack">
          <div className="landing__container">
            <span className="landing__eyebrow">{t.landing.pagina.stackEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.stackTitulo}</h2>
            <div className="landing__stack">
              {stackDe(t).map((tech) => (
                <div key={tech.nombre} className="landing__stack-item">
                  <span className="landing__stack-nombre">{tech.nombre}</span>
                  <span className="landing__stack-rol">{tech.rol}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonios */}
        <section className="landing__section landing__section--dark">
          <div className="landing__container">
            <span className="landing__eyebrow">{t.landing.pagina.testimoniosEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.testimoniosTitulo}</h2>
            <div className="landing__testimonios">
              {testimoniosDe(t).map((t) => (
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
            <span className="landing__eyebrow">{t.landing.pagina.faqsEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.faqsTitulo}</h2>
            <div className="landing__faq">
              {faqsDe(t).map((faq, index) => (
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
            <span className="landing__eyebrow">{t.landing.pagina.principiosEyebrow}</span>
            <h2 className="landing__section-title">{t.landing.pagina.principiosTitulo}</h2>
            <div className="landing__principles">
              {principiosDe(t).map((principio, index) => (
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
            <h2 className="landing__section-title">¿Listo para tomar el control? Hoy.</h2>
            <Text as="p" size="lg" className="landing__cta-final-desc">
              {t.landing.pagina.cierreLead} <strong>{t.landing.pagina.cierreFuerte}</strong>
            </Text>
            <div className="landing__cta">
              <ButtonLink variant="primary" href={PATH.configurarAdministrador}>
                {t.landing.pagina.cierreCtaAdmin}
              </ButtonLink>
              <ButtonLink variant="secondary" href={PATH.login}>
                {t.landing.pagina.cierreCtaLogin}
              </ButtonLink>
            </div>
            <p className="landing__cta-nota">
              {t.landing.pagina.cierreNota}
              &middot; Hecho en Rust para durar décadas
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
              {t.landing.pagina.pieLead}
            </Text>
          </div>
          <nav className="landing__footer-nav" aria-label={t.landing.pagina.enlacesPie}>
            <a href="#caracteristicas">{t.landing.pagina.navCaracteristicas}</a>
            <a href="#comparativa">{t.landing.pagina.navComparativa}</a>
            <a href="#faq">FAQ</a>
            <a href="/ayuda">{t.landing.pagina.navAyuda}</a>
            <a href="/ayuda/glosario">{t.landing.pagina.navGlosario}</a>
          </nav>
          <Text as="span" size="xs" color="muted">
            {t.landing.pagina.pieFirma}
          </Text>
        </div>
      </footer>
    </div>
  );
}
