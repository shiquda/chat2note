/**
 * Custom icon components
 * These icons are custom-designed for Chat2Note and not available in standard icon libraries
 */

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
  stroke?: string
}

/**
 * Custom Obsidian icon
 * Based on design in tmp/obsidian.svg
 */
export function IconObsidian({
  size = 24,
  color = 'currentColor',
  stroke = '2',
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="icon icon-tabler icon-tabler-obsidian"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={stroke}
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 2l6 5l-2 12l-4 3l-4 -3l-2 -12z" />
      <path d="M12 2v18" />
      <path d="M6 7l12 0" />
    </svg>
  )
}

/**
 * Custom Joplin icon styled to match Tabler icons
 * Simple "J" letter design following Tabler's clean stroke-based style
 */
export function IconJoplin({
  size = 24,
  color = 'currentColor',
  stroke = '2',
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="icon icon-tabler icon-tabler-brand-joplin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={stroke}
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      {/* Main J shape - vertical stem with curve at bottom */}
      <path d="M8 4h8v12a4 4 0 0 1-8 0" />
      {/* Small horizontal line at top to make it more recognizable as J */}
      <path d="M8 8h5" />
    </svg>
  )
}
