import { ChatWindow } from "../components/ChatWindow";
import { EvidenceRoom } from "../components/EvidenceRoom";
import { VisitorTracker } from "../components/VisitorTracker";

export default function HomePage() {
  return (
    <>
      <VisitorTracker />
      <ChatWindow />
      <EvidenceRoom />
    </>
  );
}
