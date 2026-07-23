import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Role } from "@repo/shared";
import request from "supertest";

import { AuthModule } from "../src/auth/auth.module";
import { CurrentUser } from "../src/auth/decorators/current-user.decorator";
import { Roles } from "../src/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../src/auth/guards/roles.guard";
import { DrizzleModule } from "../src/db/drizzle.module";

/**
 * Proves the RBAC primitives (JwtAuthGuard + RolesGuard + @Roles + @CurrentUser)
 * the way tickets 03–07 will consume them: a feature module in another file
 * imports the guards by path and stacks them on its own routes. If this wiring
 * ever breaks, downstream tickets break — hence a dedicated e2e.
 */
@Controller("probe")
class ProbeController {
  @Get("any-auth")
  @UseGuards(JwtAuthGuard)
  anyAuth(@CurrentUser() user: { sub: number; role: Role }) {
    return { sub: user.sub, role: user.role };
  }

  @Get("librarian-plus")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  librarianPlus() {
    return { ok: true };
  }

  @Get("owner-only")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  ownerOnly() {
    return { ok: true };
  }
}

@Module({
  imports: [DrizzleModule.forRoot({ url: ":memory:" }), AuthModule],
  controllers: [ProbeController],
})
class ProbeModule {}

describe("RBAC primitives (e2e)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  async function buildApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    const nest = moduleRef.createNestApplication();
    await nest.init();
    return nest;
  }

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const registerAs = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "password123" });
    return res.body.token as string;
  };

  // First registrant = OWNER, second = MEMBER (bootstrap). One shared DB here.
  let ownerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    ownerToken = await registerAs("owner@example.com");
    memberToken = await registerAs("member@example.com");
  });

  it("JwtAuthGuard populates the caller on an auth-only route", async () => {
    const res = await request(app.getHttpServer())
      .get("/probe/any-auth")
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe(Role.MEMBER);
    expect(typeof res.body.sub).toBe("number");
  });

  it("RolesGuard lets an allowed role through (owner on librarian+)", async () => {
    const res = await request(app.getHttpServer())
      .get("/probe/librarian-plus")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  it("RolesGuard 403s a role not in the allow-list (member on librarian+)", async () => {
    const res = await request(app.getHttpServer())
      .get("/probe/librarian-plus")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it("RolesGuard 403s an owner-only route for a non-owner", async () => {
    // Neither the member token nor any librarian should reach owner-only;
    // an owner does.
    const memberRes = await request(app.getHttpServer())
      .get("/probe/owner-only")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(memberRes.status).toBe(403);

    const ownerRes = await request(app.getHttpServer())
      .get("/probe/owner-only")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(200);
  });

  it("a guarded route with no token is 401", async () => {
    const res = await request(app.getHttpServer()).get("/probe/librarian-plus");
    expect(res.status).toBe(401);
  });
});
