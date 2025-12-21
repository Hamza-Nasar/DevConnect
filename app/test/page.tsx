export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">✅ Server is Working!</h1>
        <p className="text-gray-400">If you can see this, the server is running correctly.</p>
        <p className="text-gray-500 mt-4">Next step: Configure DATABASE_URL in .env.local</p>
      </div>
    </div>
  );
}







