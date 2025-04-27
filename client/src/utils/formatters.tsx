/**
 * Text and time formatting utilities
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Format a timestamp to a time string (hours:minutes)
 */
export const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format an event timestamp to a time string (hours:minutes:seconds)
 */
export const formatEventTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * Format line breaks in text
 */
export const formatLineBreaks = (text: string) => {
  if (!text) return '';
  
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </React.Fragment>
  ));
};

/**
 * Format inline code in text
 */
export const formatInlineCode = (text: string) => {
  // Handle null or undefined text
  if (!text) return '';
  
  // Process inline code (`code`)
  const inlineCodeRegex = /`([^`]+)`/g;
  let parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before the inline code
    if (match.index > lastIndex) {
      parts.push(formatLineBreaks(text.substring(lastIndex, match.index)));
    }
    
    // Add the inline code
    parts.push(
      <code key={`inline-${match.index}`} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
        {match[1]}
      </code>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last inline code
  if (lastIndex < text.length) {
    parts.push(formatLineBreaks(text.substring(lastIndex)));
  }
  
  return parts.length ? parts : formatLineBreaks(text);
};

/**
 * Format chat messages with code blocks and inline code
 */
export const formatChatMessage = (text: string) => {
  // Handle null or undefined text
  if (!text) return '';
  
  // Process code blocks (```code```)
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push(formatInlineCode(text.substring(lastIndex, match.index)));
    }
    
    // Add the code block with markdown
    parts.push(<ReactMarkdown key={`code-${match.index}`}>{match[0]}</ReactMarkdown>);
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last code block
  if (lastIndex < text.length) {
    parts.push(formatInlineCode(text.substring(lastIndex)));
  }
  
  return parts.length ? parts : formatInlineCode(text);
};
