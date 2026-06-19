import ScrollProgress from "./components/landing/ScrollProgress";
import Navigation from "./sections/Navigation";
import Hero from "./sections/Hero";
import HowItWorks from "./sections/HowItWorks";
import TheSwarm from "./sections/TheSwarm";
import AITutor from "./sections/AITutor";
import FeatureSpotlight from "./sections/FeatureSpotlight";
import InteractiveDemo from "./sections/InteractiveDemo";
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
      <HowItWorks />
      <TheSwarm />
      <AITutor />
      <FeatureSpotlight />
      <InteractiveDemo />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
