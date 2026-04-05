import { useTheme } from "next-themes";

export function ProductHuntBadge() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex justify-center w-full">
      <a 
        href="https://www.producthunt.com/products/dumpr-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-dumpr-2" 
        target="_blank" 
        rel="noopener noreferrer"
        className="transition-transform hover:scale-105 active:scale-95 grayscale hover:grayscale-0 opacity-80 hover:opacity-100"
      >
        <img 
          alt="Dumpr - The social feed that only exists on weekends. | Product Hunt" 
          width="250" 
          height="54" 
          src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1116372&theme=${resolvedTheme === 'light' ? 'light' : 'dark'}&t=1775410626048`} 
        />
      </a>
    </div>
  );
}
