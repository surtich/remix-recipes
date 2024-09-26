import "./paragraph.css";

type ParagraphProps = {
  children: string;
};

export default function Paragraph({ children }: ParagraphProps) {
  return <p className="paragraph">{children}</p>;
}
