import React from 'react';

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

/** Inline formatting: **bold**, *emphasis* and `code`. */
export const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(INLINE).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
      return <React.Fragment key={i}>{part}</React.Fragment>;
    })}
  </>
);

/** Paragraphs separated by blank lines. */
export const Rich: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <>
    {text.split(/\n\n+/).map((para, i) => (
      <p key={i} className={className}>
        <Inline text={para} />
      </p>
    ))}
  </>
);
