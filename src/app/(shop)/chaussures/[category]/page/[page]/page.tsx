import { catalogMetadata, ShopCatalog } from "@/components/ShopCatalog";

export const revalidate = 86400;
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ category: string; page: string }> };
export async function generateMetadata({ params }: Props) { const p = await params; return catalogMetadata(p.category, p.page); }
export default async function Page({ params }: Props) { const p = await params; return <ShopCatalog category={p.category} rawPage={p.page} paginated />; }
