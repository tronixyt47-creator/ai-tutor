import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-mist-100/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-mist-200">{children}</em>,
          h1: ({ children }) => (
            <h3 className="mb-2 mt-4 font-display text-base font-semibold text-white first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-4 font-display text-base font-semibold text-white first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-3.5 text-[15px] font-semibold text-white first:mt-0">{children}</h4>
          ),
          h4: ({ children }) => (
            <h5 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-mist-300 first:mt-0">
              {children}
            </h5>
          ),
          ul: ({ children }) => <ul className="mb-2.5 list-disc space-y-1 pl-5 marker:text-accent-400">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 list-decimal space-y-1 pl-5 marker:text-accent-400">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-300 underline decoration-accent-400/40 underline-offset-2 hover:text-accent-200"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[13px] text-mint-300">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="mb-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[13px] leading-relaxed">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2.5 border-l-2 border-accent-400/50 pl-3 text-mist-200">{children}</blockquote>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-white">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-white/[0.06] px-3 py-2 align-top">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
