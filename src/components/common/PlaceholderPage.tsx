interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: string;
}

export default function PlaceholderPage({ title, description, icon = '🚧' }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-8xl mb-4">{icon}</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-500">
          This page is under construction
        </p>
      </div>
    </div>
  );
}
