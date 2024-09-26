import { LinksFunction } from "@remix-run/node";

import styles from "~/styles/index.css?url"; // se añade la url para que se genere un archivo url string

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export default function Index() {
  return <h1>Welcome to Remix</h1>;
}
