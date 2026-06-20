import MemberGuard from "@/components/MemberGuard";

export default function MemberLayout({ children }) {
  return <MemberGuard>{children}</MemberGuard>;
}
