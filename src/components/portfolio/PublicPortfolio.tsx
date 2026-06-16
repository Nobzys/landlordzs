import Image from 'next/image'
import { MapPin, Calendar, Quote } from 'lucide-react'

export interface PublicProjectImage {
  signedUrl:    string
  display_order: number
}

export interface PublicProject {
  id:                string
  title:             string
  description:       string | null
  category:          string | null
  completion_year:   number | null
  location:          string | null
  client_testimonial: string | null
  images:            PublicProjectImage[]
}

interface PublicPortfolioProps {
  projects:  PublicProject[]
  role:      string
}

const EMPTY_STATE: Record<string, string> = {
  architect:  'No design projects added yet.',
  engineer:   'No engineering projects added yet.',
  contractor: 'No construction projects added yet.',
  lawyer:     'No case studies added yet.',
  vendor:     'No product showcases added yet.',
  agent:      'No completed transactions added yet.',
}

export function PublicPortfolio({ projects, role }: PublicPortfolioProps) {
  const emptyText = EMPTY_STATE[role] ?? 'No portfolio projects yet.'

  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Portfolio
      </h2>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const coverImage = project.images
              .slice()
              .sort((a, b) => a.display_order - b.display_order)[0]

            return (
              <article
                key={project.id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Cover image */}
                {coverImage && (
                  <div className="relative w-full aspect-video bg-muted">
                    <Image
                      src={coverImage.signedUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
                      unoptimized
                    />
                  </div>
                )}

                {/* Image strip (remaining images) */}
                {project.images.length > 1 && (
                  <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
                    {project.images
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .slice(1)
                      .map((img, i) => (
                        <div
                          key={i}
                          className="relative h-16 w-24 shrink-0 rounded-md overflow-hidden bg-muted"
                        >
                          <Image
                            src={img.signedUrl}
                            alt={`${project.title} photo ${i + 2}`}
                            fill
                            className="object-cover"
                            sizes="96px"
                            unoptimized
                          />
                        </div>
                      ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-base leading-snug">{project.title}</h3>
                    {project.category && (
                      <span className="text-xs text-muted-foreground border rounded-full px-2.5 py-0.5 shrink-0">
                        {project.category}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {project.completion_year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {project.completion_year}
                      </span>
                    )}
                    {project.location && (
                      <span className="flex items-center gap-1 capitalize">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {project.client_testimonial && (
                    <blockquote className="border-l-2 border-primary/30 pl-4 py-1 space-y-1">
                      <Quote className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <p className="text-sm italic text-muted-foreground leading-relaxed">
                        {project.client_testimonial}
                      </p>
                    </blockquote>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
