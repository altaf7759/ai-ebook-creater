import { BookOpen, ChevronLeft } from "lucide-react";

const ViewChapterSidebar = ({
  book,
  selectedChapterIndex,
  onSelectChapter,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClose={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative left-0 top-0 h-full w-80 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-violet-600" />
              <span className="font-medium text-gray-900">Chapters</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {book.chapters.map((chapter, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectChapter(index);
                onClose();
              }}
              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0
              ${
                selectedChapterIndex === index
                  ? "bg-violet-50 border-l-4 border-l-violet-600"
                  : ""
              }
              `}
            >
              <div
                className={`font-medium text-sm truncate ${
                  selectedChapterIndex === index
                    ? "text-violet-900"
                    : "text-gray-900"
                }`}
              >
                {chapter.title}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Chapter {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ViewChapterSidebar;
