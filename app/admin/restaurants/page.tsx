import {
  redirect
} from "next/navigation";


export default function RestaurantAdminRedirect() {
  redirect(
    "/admin/submissions#imported-restaurants"
  );
}
