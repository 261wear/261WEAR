import { catalogMetadata, ShopCatalog } from "@/components/ShopCatalog";

export const revalidate = 86400;
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ category: string }> };
export async function generateMetadata({ params }: Props) { return catalogMetadata((await params).category); }
export default async function Page({ params }: Props) { return <ShopCatalog category={(await params).category} />; }
