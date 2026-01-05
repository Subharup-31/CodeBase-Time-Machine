import Hero from "@/app/dashboard/components/landing/Hero";
import Features from "@/app/dashboard/components/landing/Features";
import HowItWorks from "@/app/dashboard/components/landing/HowItWorks";
import DiagramPreview from "@/app/dashboard/components/landing/DiagramPreview";
import Testimonials from "@/app/dashboard/components/landing/Testimonials";
import Pricing from "@/app/dashboard/components/landing/Pricing";
import CTA from "@/app/dashboard/components/landing/CTA";
import Footer from "@/app/dashboard/components/landing/Footer";
import Navbar from "@/app/dashboard/components/landing/Navbar";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-white flex flex-col font-sans text-gray-900 overflow-x-hidden">
            <Navbar />
            <Hero />
            <Features />
            <HowItWorks />
            <DiagramPreview />
            <Testimonials />
            <Pricing />
            <CTA />
            <Footer />
        </main>
    );
}
