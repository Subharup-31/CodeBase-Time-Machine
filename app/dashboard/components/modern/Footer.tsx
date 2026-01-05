export default function Footer() {
    return (
        <footer className="py-12 border-t bg-background">
            <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Time-Machine</span>
                    <span className="text-muted-foreground text-sm">© 2024</span>
                </div>

                <div className="flex gap-6 text-sm text-muted-foreground">
                    <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                    <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                    <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                    <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
                </div>
            </div>
        </footer>
    );
}
