import { Suspense } from "react";
import RecipeFinderClient from "./RecipeFinderClient";

export default function RecipeFinderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RecipeFinderClient />
    </Suspense>
  );
}
