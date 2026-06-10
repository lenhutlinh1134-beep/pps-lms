import { OnlinePresence } from "@/components/student/OnlinePresence";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OnlinePresence />
      {children}
    </>
  );
}
