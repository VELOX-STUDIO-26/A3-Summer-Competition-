import ScrollProgress from "./components/landing/ScrollProgress";
import Navigation from "./sections/Navigation";
import Hero from "./sections/Hero";
import TrustBar from "./sections/TrustBar";
import HowItWorks from "./sections/HowItWorks";
import TheSwarm from "./sections/TheSwarm";
import FeatureSpotlight from "./sections/FeatureSpotlight";
import InteractiveDemo from "./sections/InteractiveDemo";
import Metrics from "./sections/Metrics";
import Testimonials from "./sections/Testimonials";
import Pricing from "./sections/Pricing";
import FAQ from "./sections/FAQ";
import FinalCTA from "./sections/FinalCTA";
import Footer from "./sections/Footer";

export default function Home() {
  return (
    <main id="main-content" className="relative">
      <ScrollProgress />
      <Navigation />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <TheSwarm />
      <FeatureSpotlight />
      <InteractiveDemo />
      <Metrics />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
