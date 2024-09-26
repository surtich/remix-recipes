import classes from "./paragraph.module.css";

type ParagraphProps = {
  children: string;
};

export default function Paragraph({ children }: ParagraphProps) {
  return <p className={classes.paragraph}>{children}</p>;
}
