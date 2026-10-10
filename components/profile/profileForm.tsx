"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, UpdateProfileType } from "@/lib/validator";
import { updateProfileAction } from "@/lib/actions/userActions";
import { useTransition, useState } from "react";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import Image from "next/image";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "../ui/textarea";


// Profile Form Component, receives user info prop
export default function ProfileForm({ user }: { user: { id: string; email: string; name: string; bio?: string; image?: string } }) {
  
  const [preview, setPreview] = useState(user.image);         // state for image preview
  const [isPending, startTransition] = useTransition();       // useTransition for async server-action, used to show loading state
  const { setUser } = useAuth();       // get setUser from useAuth hook to update user authProvider after profile update

  // React Hook Form setup with Zod validation & default values
  const form = useForm<UpdateProfileType>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name: user.name, bio: user.bio || "" , image:  null } });

  // On form submit handler
  const onSubmit = (values: UpdateProfileType) => {
    startTransition(async () => {
      // Prepare FormData for submission (to handle file upload + other fields)
      const fd = new FormData();
      fd.append("name", values.name);
      if (values.bio) fd.append("bio", values.bio);
      if (values.image instanceof File) fd.append("image", values.image); 

      const res = await updateProfileAction(fd, user.id);    // call server-action to update profile
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; }

      toast.success("Profile updated!");    // show success toast
      setUser(res.user);                    // update user in authProvider context (Navbar, Sidebar & any client-component see the new profile immediately)
      if (res.user.image) setPreview(res.user.image);  // update preview if new image returned
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col space-y-4 p-6 w-full mx-auto border rounded-xl shadow">
        <h2 className="text-xl font-semibold">Update Profile</h2>
        
        {/* Email (disabled) */}
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={user.email} disabled className="bg-muted" />
          </FormControl>
        </FormItem>

        {/* Name */}
        <FormField name="name" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField name="bio" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
             <FormControl>
                <Textarea rows={6} placeholder="Write about yourself..." {...field} value={field.value ?? ""}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image + Set Image Preview */}
        <FormField name="image" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Image</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { field.onChange(file); setPreview(URL.createObjectURL(file)); }
                  }}
                />
              </FormControl>

              {/* Profile Image preview */}
              <div className="mt-2 w-24 h-24 relative">
               <Image src={preview || "/default-avatar.png"} alt="Preview" fill className="rounded-full object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
              </div>
            </FormItem>
          )}
        />
        
        {/* Submit Button */}
        <Button disabled={isPending} className="w-full mt-auto cursor-pointer">{isPending ? "Updating..." : "Update"}</Button>
      </form>
    </Form>
  );
}
