import AdultAccountGate from "@/components/AdultAccountGate";

export default function AccountLayout({children}:{children:React.ReactNode}){
  return <AdultAccountGate>{children}</AdultAccountGate>;
}
