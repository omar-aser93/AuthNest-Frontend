'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';             //shadcn button


// Numbered Pagination client-component (Offset-based pagination)
const Pagination = ({ page, totalPages, urlParamName = 'page' }: { page: number | string; totalPages: number; urlParamName?: string; }) => {
  
  const router = useRouter();                    //useRouter() hook to dynamically navigate to a page
  const searchParams = useSearchParams();        //useSearchParams() hook to get URL searchParams in a client-component
  
  //Function to navigate to a specific pagination page, it receives the page number
  const goToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;      //if page num is negative or > total pages, return out

    const params = new URLSearchParams(searchParams);           //create object of the URL params
    params.set(urlParamName, pageNumber.toString());            //append '?page=' param & set it's value to pageNumber
    router.push(`?${params.toString()}`);                       //push to the needed page based on the param
  };


  // Function to generate page numbers with truncation (e.g., "1 ... 5 6 7 ... 10")
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];       // Array to hold page numbers and ellipses ("...")
    const range = 2;                             // Show 2 pages before and after the current page

    // Show all pages if totalPages is small (<= 7)
    if (totalPages <= 7) { return Array.from({ length: totalPages }, (_, i) => i + 1); } 

    pages.push(1);                                            // Always include first page    
    if (Number(page) - range > 2) { pages.push('...') }       // Show ellipsis if currentPage is far from first page
    
    // Generate middle pages
    for (let i = Math.max(2, Number(page) - range); i <= Math.min(totalPages - 1, Number(page) + range); i++) {
      pages.push(i);
    }    
   
    if (Number(page) + range < totalPages - 1) { pages.push('...') }  // Show ellipsis if there's a gap before last page
    pages.push(totalPages);                                           // Always include last page

    return pages;                      // Return the array of page numbers and ellipses
  };
  

  return (
    <div className='flex gap-2 my-3'>
      {/* prev button, onClick will decrement page number .. also, will be disabled if page number is 1 */}
      <Button onClick={() => goToPage(Number(page) - 1)} disabled={Number(page) <= 1} size='lg' variant='outline' className='w-28' > 
        Previous 
      </Button>

      {/* Page Numbers buttons, create array of numbers from 1 to total pages, then map through it */}
      {getPageNumbers().map((pageNumber, index) =>
        pageNumber === '...' ? (<span key={`ellipsis-${index}`} className="px-3 py-2"> ... </span> ) : (
          <Button key={pageNumber} onClick={() => goToPage(Number(pageNumber))} variant={Number(pageNumber) === Number(page) ? 'default' : 'outline'} className="w-10" >
            {pageNumber}
          </Button> 
        ) )}

      {/* Next button, onClick will increment page number .. also, will be disabled for last page (page number is equal to total pages) */}
      <Button onClick={() => goToPage(Number(page) + 1)} disabled={Number(page) >= totalPages} size='lg' variant='outline' className='w-28' > 
        Next 
      </Button>
    </div>
  );
};

export default Pagination;