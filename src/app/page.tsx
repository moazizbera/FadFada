import { ChatWindow } from "../components/ChatWindow";
import { VisitorTracker } from "../components/VisitorTracker";

export default function HomePage() {
  return (
    <div>
      <VisitorTracker />
      <ChatWindow />
    </div>
  );
}
