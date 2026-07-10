import pathlib

p = pathlib.Path("src/components/landing/Navbar.tsx")
s = p.read_text()

old_import = 'import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";'
assert old_import in s, "sheet import line not found — file may differ from expected"
new_import = 'import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";'
s = s.replace(old_import, new_import)

old_sheet_content = '''            <SheetContent
              side="right"
              className="bg-[#161210]/80 backdrop-blur-md border-white/10 text-white w-4/5 h-fit top-0 bottom-auto"
            >
              <div className="mt-10 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
                <Link
                  to="/"
                  search={{ authModalOpen: true }}
                  onClick={() => setMobileOpen(false)}
                  className="text-center rounded-md px-4 py-2.5 text-sm font-medium text-white/85 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  className="rounded-full bg-[#C96A3D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#E28743]"
                >
                  <Link
                    to="/"
                    search={{ authModalOpen: true }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </Link>
                </Button>
              </div>
            </SheetContent>'''
assert old_sheet_content in s, "SheetContent block not found — file may differ from expected"

new_sheet_content = '''            <SheetContent
              side="right"
              className="bg-[#161210]/95 backdrop-blur-xl border-white/10 text-white w-4/5 sm:max-w-sm p-0 gap-0 flex flex-col"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

              <div className="flex items-center px-6 pt-6 pb-5 border-b border-white/10 flex-shrink-0">
                <Logo to="/" size="md" />
              </div>

              <div className="flex flex-col gap-1 px-4 pt-4 flex-1 overflow-y-auto">
                {NAV_LINKS.map((link) => (
                  
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3.5 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white active:bg-white/10 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div
                className="flex flex-col gap-3 border-t border-white/10 px-4 pt-5 flex-shrink-0"
                style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
              >
                <Link
                  to="/"
                  search={{ authModalOpen: true }}
                  onClick={() => setMobileOpen(false)}
                  className="text-center rounded-lg px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  className="rounded-full bg-[#C96A3D] px-5 py-3 text-sm font-medium text-white hover:bg-[#E28743]"
                >
                  <Link
                    to="/"
                    search={{ authModalOpen: true }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </Link>
                </Button>
              </div>
            </SheetContent>'''
s = s.replace(old_sheet_content, new_sheet_content)

p.write_text(s)
print("Patched Navbar.tsx: rebuilt mobile drawer as full-height branded panel OK")
