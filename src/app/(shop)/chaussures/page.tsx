import { catalogMetadata, ShopCatalog } from "@/components/ShopCatalog";

export const revalidate = 86400;
export function generateMetadata() { return catalogMetadata(); }
export default function Page() { return <ShopCatalog />; }
