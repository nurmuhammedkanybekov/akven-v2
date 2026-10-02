import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { Button } from "../components/Button";

export function NotFoundPage({ what = "That page" }: { what?: string }) {
  return (
    <div className="av-container av-page av-empty">
      <Logo variant="mark" height={72} />
      <h1>{what} is not here</h1>
      <p className="av-lead">It may have moved or been taken off the shelf. <Link to="/shop">Browse all socks</Link> or go back home.</p>
      <Button to="/">Back to the shop</Button>
    </div>
  );
}
