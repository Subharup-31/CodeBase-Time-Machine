import Hero from "@/app/dashboard/components/landing/Hero";
import Features from "@/app/dashboard/components/landing/Features";
import DiagramPreview from "@/app/dashboard/components/landing/DiagramPreview";
import CTA from "@/app/dashboard/components/landing/CTA";
import Footer from "@/app/dashboard/components/landing/Footer";
import Navbar from "@/app/dashboard/components/landing/Navbar";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
            <Navbar />
            <Hero />
            <Features />
            <DiagramPreview />
            <CTA />
            <Footer />
        </main>
    );
}
