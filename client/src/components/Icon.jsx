import * as LucideIcons from 'lucide-react';

export default function Icon({ name, size = 20, color = 'currentColor', className = '' }) {
  const LucideIcon = LucideIcons[name] || LucideIcons['HelpCircle']; // Default icon if not found

  return <LucideIcon size={size} color={color} className={className} />;
}
