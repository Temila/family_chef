/** AdminWishesPage - D-04 薄包装：以 viewAsAdmin=true 复用 ChefWishesPage */
import ChefWishesPage from './ChefWishesPage';

export default function AdminWishesPage() {
  return <ChefWishesPage viewAsAdmin={true} />;
}
