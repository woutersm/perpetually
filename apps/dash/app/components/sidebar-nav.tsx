import { NavLink } from "react-router";
import { buttonVariants } from "./ui/button";
import { cn } from "@perpetually/db/utils";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    to: string;
    title: string;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 font-display",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <NavLink
          end
          key={item.to}
          to={item.to}
          className={({ isActive }) => {
            return cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "justify-start text-zinc-950",
              isActive ? "text-[#b060ff]" : "hover:text-[#b060ff]"
            );
          }}
        >
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}
