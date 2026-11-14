import { catalogMetadata, ShopCatalog } from "@/components/ShopCatalog";

export const revalidate = 86400;
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ page: string }> };
export async function generateMetadata({ params }: Props) { return catalogMetadata(undefined, (await params).page); }
export default async function Page({ params }: Props) { return <ShopCatalog rawPage={(await params).page} paginated />; }
