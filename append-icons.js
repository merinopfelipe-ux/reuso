const fs = require('fs');
const icons = [
  'Activity', 'AlertCircle', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'BarChart2', 'Bath', 'Bell', 'BookOpen', 'Bot', 'Building2', 'Calculator', 'Calendar', 'Camera', 'Car', 'Check', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronsUpDown', 'Circle', 'CircleDollarSign', 'CircleHelp', 'CircleUser', 'ClipboardList', 'Clock', 'Cookie', 'Copy', 'Cpu', 'CreditCard', 'Database', 'Download', 'Droplet', 'Dumbbell', 'ExternalLink', 'Eye', 'EyeOff', 'FileText', 'Filter', 'FlaskConical', 'Globe', 'Hammer', 'Headphones', 'Headset', 'HeartHandshake', 'History', 'Home', 'IdCard', 'Image', 'Inbox', 'Info', 'Key', 'KeyRound', 'Layers', 'LayoutGrid', 'Leaf', 'LifeBuoy', 'Link', 'List', 'Loader2', 'Lock', 'LockKeyhole', 'LogOut', 'Mail', 'Medal', 'MessageSquare', 'Minus', 'MinusCircle', 'Monitor', 'Moon', 'Package', 'PenLine', 'Pencil', 'Percent', 'Phone', 'Plus', 'PlusCircle', 'Power', 'QrCode', 'Quote', 'RefreshCcw', 'RefreshCw', 'RotateCcw', 'Save', 'Scale', 'Search', 'Send', 'SendHorizontal', 'Settings', 'Shield', 'ShieldCheck', 'ShowerHead', 'SlidersHorizontal', 'Square', 'SquareCheck', 'Store', 'Sun', 'Tag', 'Target', 'Trash2', 'TreeDeciduous', 'TrendingDown', 'TrendingUp', 'TriangleAlert', 'Trophy', 'Upload', 'User', 'UserCheck', 'UserPlus', 'Users', 'X', 'XCircle', 'Zap'
];

let content = fs.readFileSync('src/components/ui/icons.tsx', 'utf8');

let newExports = '\n// --- AUTO-GENERATED EXPORTS ---\n';
icons.forEach(icon => {
  // Check if we already export this exact name
  const regex = new RegExp(`export const ${icon} =`);
  if (!regex.test(content)) {
    newExports += `export const ${icon} = wrapIcon(Lucide.${icon})\n`;
  }
});

// We need to insert this BEFORE the brand-logos re-export if possible, or just at the very end
content = content.replace('// Export brand logos', newExports + '\n// Export brand logos');

fs.writeFileSync('src/components/ui/icons.tsx', content, 'utf8');
console.log('Appended icons successfully.');
