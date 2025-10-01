import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageNavigationProps {
  breadcrumbItems?: BreadcrumbItem[];
  backLink?: string;
  showBackButton?: boolean;
}

export default function PageNavigation({ 
  breadcrumbItems = [], 
  backLink = "/", 
  showBackButton = true 
}: PageNavigationProps) {
  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg border" data-testid="page-navigation">
      {/* Back Button */}
      {showBackButton && (
        <Link href={backLink}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </Link>
      )}

      {/* Breadcrumb Navigation */}
      <Breadcrumb className="flex-1 ml-4" data-testid="breadcrumb">
        <BreadcrumbList>
          {/* Home item */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" className="flex items-center" data-testid="breadcrumb-home">
                <Home className="w-3.5 h-3.5 mr-1" />
                Trang chủ
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {/* Dynamic breadcrumb items */}
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} data-testid={`breadcrumb-link-${index}`}>
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : index < breadcrumbItems.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <span className="cursor-default" data-testid={`breadcrumb-item-${index}`}>
                      {item.label}
                    </span>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage data-testid={`breadcrumb-current-${index}`}>
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
