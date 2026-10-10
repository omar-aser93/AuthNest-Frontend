// Loading Spinner Component
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black" />
    </div>
  );
}
