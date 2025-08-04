import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function services() {
  return (
    <section>
<section id="process" className="py-16 px-4 max-w-5xl mx-auto ">
        <h2 className="text-2xl font-bold mb-6 text-center">מפת הדרך למשכנתא</h2>
        <Tabs defaultValue="1">
          <TabsList className="flex justify-center gap-2 flex-wrap">
            <TabsTrigger value="1">אבחון כלכלי</TabsTrigger>
            <TabsTrigger value="2">איסוף מסמכים</TabsTrigger>
            <TabsTrigger value="3">בדיקת הצעות</TabsTrigger>
            <TabsTrigger value="4">ניהול מו"מ</TabsTrigger>
            <TabsTrigger value="5">חתימה</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>


      <section id="stats" className="py-16 px-4 bg-muted">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold">+1,200</p>
              <p className="text-muted-foreground">לקוחות מרוצים</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold">98%</p>
              <p className="text-muted-foreground">שביעות רצון</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold">₪270,000</p>
              <p className="text-muted-foreground">חיסכון ממוצע למשפחה</p>
            </CardContent>
          </Card>
        </div>
      </section>
      </section>)}