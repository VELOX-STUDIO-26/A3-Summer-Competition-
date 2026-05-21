export default function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NOBOGYAN",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "NOBOGYAN deploys a swarm of 15+ specialized AI agents that profile, plan, tutor, and assess — all working together to create personalized learning experiences.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available, Pro starts at $19/month",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "2000",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Organization",
      name: "NOBOGYAN",
      url: "https://nobogyan.com",
    },
    featureList: [
      "15+ AI Agents",
      "Personalized Learning Paths",
      "Adaptive Assessments",
      "Real-time Tutoring",
      "Progress Analytics",
      "Voice Input/Output",
    ],
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NOBOGYAN",
    url: "https://nobogyan.com",
    logo: "https://nobogyan.com/nobogyan-logo.png",
    description: "AI-powered personalized learning platform",
    foundingDate: "2026",
    sameAs: [
      // Add social media links when available
      // "https://twitter.com/nobogyan",
      // "https://linkedin.com/company/nobogyan",
    ],
  };

  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NOBOGYAN",
    url: "https://nobogyan.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://nobogyan.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteData) }}
      />
    </>
  );
}
