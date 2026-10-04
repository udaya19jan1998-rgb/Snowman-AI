import React from "react";
import ReactMarkdown from "react-markdown";
import CodeCard from "./CodeCard";
// Keep the language label separate from copied code.
function CodeBlock({
  children
}) {
  const child = React.Children.toArray(children)[0];
  if (!React.isValidElement(child)) return <pre>{children}</pre>;
  const language = /(?:^|\s)language-(\S+)/.exec(child.props.className || "")?.[1] || "";
  return <CodeCard language={language} code={String(child.props.children ?? "")} />;
}
const components = {
  pre: CodeBlock
};
export default function MarkdownMessage({
  content
}) {
  return <div className="snow-markdown"><ReactMarkdown components={components}>{content}</ReactMarkdown></div>;
}
