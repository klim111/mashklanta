/**
 * דפים מגרסה קודמת של האתר שאינם בשימוש. כתובת ישנה (מגוגל, מסימנייה או ממייל
 * ישן) מגיעה לכלי העדכני שמחליף אותה. הפניה זמנית (307), כדי שאפשר יהיה לבטל.
 */
const LEGACY_PAGES = [
  ['/mortgage-dashboard', '/dashboard'],
  ['/mortgage-application', '/dashboard'],
  ['/principal-approval', '/dashboard'],
  ['/custom-mix-builder', '/dashboard/mix-planner'],
  ['/uniform-mixes', '/dashboard/mix-planner'],
  ['/simulations', '/#free-tools'],
  ['/financial-dynamics', '/#free-tools'],
  ['/existing-mortgage', '/mortgage-refinance'],
  ['/interactive-mortgage-journey', '/how-it-works'],
  ['/mortgage-journey', '/how-it-works'],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return LEGACY_PAGES.map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }));
  },
};

module.exports = nextConfig;
