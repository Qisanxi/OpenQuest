import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-bark-200/60 bg-white p-4 shadow-sm dark:border-bark-800 dark:bg-bark-900 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
