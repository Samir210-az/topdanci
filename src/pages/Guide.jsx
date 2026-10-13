import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'

function Flow({ steps, label }) {
  return (
    <ol className="flow" aria-label={label}>
      {steps.map((step) => (
        <li key={step.title}>
          <strong>{step.title}</strong>
          {step.text && <span>{step.text}</span>}
        </li>
      ))}
    </ol>
  )
}

function Table({ head, rows }) {
  return (
    <div className="guide-table">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Guide() {
  return (
    <div className="guide">
      <PageHeader title="İstifadə təlimatı" back />

      <section>
        <h2>1. Bu proqram nə üçündür</h2>
        <p>
          Topdançı mağazalara mal aparıb satan şəxs üçündür. Proqramda bunları edirsən: malı müştəriyə göstərirsən, satışı yazırsan,
          müştərinin borcunu və ödənişini izləyirsən, anbarda nə qaldığını görürsən, malı aldığın təchizatçıya olan borcunu saxlayırsan.
        </p>
        <p>
          Proqram telefonda işləyir və internet olmayanda da yazmağa icazə verir. Yazılanlar telefonda qalır, internet gələndə özü göndərilir.
        </p>
      </section>

      <section>
        <h2>2. Nə etmək istəyirsən, hara basmalısan</h2>
        <Table
          head={['İstəyirəm', 'Hara basım']}
          rows={[
            ['Müştəriyə mal satmaq', 'Əsas → Satış'],
            ['Müştəriyə malı göstərmək', 'Əsas → Təqdimat'],
            ['Müştəridən pul almaq', 'Müştərilər → müştərinin adı → Ödəniş al'],
            ['Təchizatçıdan mal almaq', 'Əsas → Mal alışı'],
            ['Təchizatçıya pul vermək', 'Təchizatçılar → adı → Ödəniş et'],
            ['Yeni mal yazmaq', 'Əsas → Yeni mal'],
            ['Satılmayan malı müştəridən geri götürmək', 'Müştəri səhifəsi → Mal qaytarma'],
            ['Malı təchizatçıya qaytarmaq', 'Təchizatçı səhifəsi → Malı qaytar'],
            ['Gündəlik və aylıq nəticə', 'Hesabat və ya Əsas səhifənin aşağısı'],
            ['Səhv yazılmış əməliyyatı silmək', 'Müştəri və ya təchizatçı səhifəsi → Tarixçə → Ləğv et'],
          ]}
        />
      </section>

      <section>
        <h2>3. İlk dəfə başlayanda ardıcıllıq</h2>
        <p>Proqramı boş açanda bu sıra ilə get. Hər addım növbətisi üçün lazımdır.</p>
        <Flow
          label="Başlama ardıcıllığı"
          steps={[
            { title: 'Təchizatçı', text: 'Malı kimdən alırsan' },
            { title: 'Mal', text: 'Ad, qiymət, şəkil' },
            { title: 'Mal alışı', text: 'Anbara say daxil olur' },
            { title: 'Müştəri', text: 'Mağaza və ya şəxs' },
            { title: 'Satış', text: 'Mal müştəriyə gedir' },
            { title: 'Ödəniş', text: 'Borc bağlanır' },
          ]}
        />
      </section>

      <section>
        <h2>4. Giriş və telefona yükləmə</h2>
        <p>Proqram 6 rəqəmli PIN ilə açılır. PIN-i yalnız sən bilməlisən. Telefon itəndə və ya dəyişəndə eyni PIN ilə yenidən daxil olursan.</p>
        <p>
          Telefona yükləmək üçün yuxarıdakı “Yüklə” düyməsinə bas və ya Hesab səhifəsində “Telefona yüklə” bölməsinə bax. Yükləndikdən sonra proqram ana
          ekranda öz ikonası ilə açılır. iPhone-da Safari-də “Paylaş” düyməsindən “Ana ekrana əlavə et” seçilir.
        </p>
      </section>

      <section>
        <h2>5. Təchizatçı</h2>
        <p>
          Təchizatçı malı aldığın şirkət və ya şəxsdir. Ona olan borcun müştərilərin borcundan ayrı saxlanır, bir-birinə qarışmır.
        </p>
        <p>
          Təchizatçılar bölməsində ad, telefon, ünvan və qısa qeyd yaza bilərsən. Mal əlavə edəndə də təchizatçı seçmək olur. Siyahıda yoxdursa, elə
          oradaca yenisini yarada bilərsən.
        </p>
        <p>
          Təchizatçının səhifəsində bunlar görünür: ona borcun, ondan aldığın mallar, hər malın ondan neçəsi anbarda qalıb, seçdiyin dövrdə nə qədər almısan
          və nə qədər ödəmisən.
        </p>
      </section>

      <section>
        <h2>6. Mal əlavə etmək</h2>
        <p>Əsas → Yeni mal. Doldurulan sahələr:</p>
        <Table
          head={['Sahə', 'Nə yazılır']}
          rows={[
            ['Şəkil', 'Telefonla çək və ya qalereyadan seç. Təqdimatda müştəri bunu görür'],
            ['Ad', 'Malın adı'],
            ['Satış qiyməti', 'Müştəriyə satdığın standart qiymət'],
            ['Alış qiyməti', 'Yalnız ilk dəfə əlavə edəndə. Sonra qiymət alış səhifəsindən özü gəlir'],
            ['Ölçü vahidi', 'Ədəd, qutu, paket, kq və s.'],
            ['Az qalıb həddi', 'Anbarda bu saydan az qalanda Əsas səhifədə xəbərdarlıq çıxır'],
            ['Başlanğıc qalıq', 'Hazırda anbarda neçə ədəd var'],
            ['Təchizatçı', 'Başlanğıc qalığı kimdən almısansa'],
          ]}
        />
        <p>Anbarda saydığın say proqramdakından fərqlənirsə, malın səhifəsində “Sayı düzəlt” düyməsindən real sayı yaz.</p>
      </section>

      <section>
        <h2>7. Təchizatçıdan mal almaq</h2>
        <p>
          Əsas → Mal alışı. Təchizatçını, malı, sayı və alış qiymətini yaz. Sonra pulun nə qədərini ödədiyini seç: tam, qismən və ya borca.
          Ödəmədiyin hissə təchizatçıya borcun kimi yazılır.
        </p>
        <p>
          Alış qiymətini heç yerdə ayrıca hesablamırsan. Proqram hər alışı ayrıca saxlayır və satanda ən əvvəl alınan maldan başlayır. Misal:
        </p>
        <Table
          head={['Nə baş verdi', 'Say', 'Alış qiyməti']}
          rows={[
            ['Dünən aldın', '10 ədəd', '5 ₼'],
            ['Bu gün aldın', '10 ədəd', '6 ₼'],
            ['Müştəriyə 7 ₼-dan satdın', '12 ədəd', 'İlk 10 ədəd 5 ₼, qalan 2 ədəd 6 ₼ ilə hesablanır'],
          ]}
        />
        <p>
          Bu satışda alışın cəmi 62 ₼, satış 84 ₼, qazancın 22 ₼ olur. Bunu özün hesablamırsan, Hesabat səhifəsi göstərir. Müştəri alış qiymətini görmür.
        </p>
      </section>

      <section>
        <h2>8. Müştəri əlavə etmək</h2>
        <p>
          Müştərilər → “Yeni”. Ad, telefon, ünvan və qeyd yaza bilərsən. Müştərinin səhifəsində borcu, üzərində olan mal və bütün əməliyyatlar görünür.
          Telefon nömrəsinin yanındakı düymələrlə zəng edə və ya WhatsApp-a keçə bilərsən.
        </p>
      </section>

      <section>
        <h2>9. Satış</h2>
        <p>
          Əsas → Satış. Əvvəl müştərini seç, sonra “Mal əlavə et” ilə malları və sayını yaz. Qiyməti satış anında dəyişə bilərsən. Sonra ödənişi seç:
        </p>
        <Table
          head={['Seçim', 'Nə olur', 'Misal (cəmi 100 ₼)']}
          rows={[
            ['Tam', 'Müştəri hamısını ödəyir, borc yazılmır', 'Borc 0 ₼'],
            ['Qismən', 'Aldığın məbləği yazırsan, qalanı borca düşür', '40 ₼ aldın, borc 60 ₼'],
            ['Nisyə', 'Heç nə almırsan, hamısı borca düşür', 'Borc 100 ₼'],
          ]}
        />
        <p>Təsdiqləyəndən sonra anbardan mal çıxır, müştərinin borcu yenilənir. Müştərinin səhifəsində satışın yanındakı “Qaimə (PDF)” düyməsi qaiməni PDF kimi hazırlayır. Müştəri ekrana barmaqla imza çəkə bilər, çəkməsə PDF-də qələmlə imza yeri qalır. Qaimə və göndərilmə vaxtı sistemdə saxlanılır, düyməyə yenidən basıb istənilən vaxt göstərə və ya göndərə bilərsən.</p>
      </section>

      <section>
        <h2>10. Təqdimat</h2>
        <p>
          Əsas → Təqdimat. Malın şəkli və qiyməti böyük göstərilir. Telefonda ekrana 4 mal, kompüterdə daha çox mal sığır. Malın üstündə anbarda neçə
          qaldığı görünür. Müştərinin xoşuna gələn malı səbətə atırsan, sonda “Satış”a keçib qalanını tamamlayırsan.
        </p>
      </section>

      <section>
        <h2>11. Satışa verilən mal</h2>
        <p>
          Bəzi mağazalar malı pulsuz götürüb sonra satdıqca ödəyir. Belə halda Satış səhifəsində “Satışa verilən” seç. Mal anbardan çıxır, müştərinin
          üzərinə yazılır və <b>qiyməti dərhal onun borcuna əlavə olunur</b>.
        </p>
        <Flow
          label="Satışa verilən malın yolu"
          steps={[
            { title: 'Mal verilir', text: 'Anbardan çıxır, borca yazılır' },
            { title: 'Müştəri satır', text: 'Mal onun üzərində qalır' },
            { title: 'Hesablaşma', text: 'Satılan və qaytarılan bölünür' },
          ]}
        />
        <p>Misal: müştəriyə 10 ədəd verdin, qiyməti 7 ₼.</p>
        <Table
          head={['Mərhələ', 'Borc']}
          rows={[
            ['Mal verildi', '70 ₼'],
            ['Müştəri 6 ədəd satdı, 4 ədədi qaytardı', '70 − 28 = 42 ₼ (qaytarılan 4 × 7 ₼ borcdan çıxır)'],
            ['Müştəri 42 ₼ ödədi', '0 ₼'],
          ]}
        />
        <p>
          Hesablaşma səhifəsini müştərinin səhifəsində “Hesablaşma / qaytarma” düyməsindən açırsan. Satılan malın qiymətini verdiyindən fərqli yazsan, yalnız
          fərq borcu artırır və ya azaldır. Ödənişi də eyni səhifədə yaza bilərsən.
        </p>
      </section>

      <section>
        <h2>12. Mal qaytarma</h2>
        <p>Malın hər iki istiqamətdə geri qayıtması mümkündür.</p>
        <Table
          head={['Kim kimə qaytarır', 'Hara basılır', 'Hansı qiymətlə', 'Nə dəyişir']}
          rows={[
            ['Müştəri mənə', 'Müştəri səhifəsi → Mal qaytarma', 'Ona satdığım qiymətlə', 'Mal anbara qayıdır, müştərinin borcu azalır'],
            ['Mən təchizatçıya', 'Təchizatçı səhifəsi → Malı qaytar', 'Aldığım qiymətlə', 'Mal anbardan çıxır, təchizatçıya borcum azalır'],
          ]}
        />
        <p>Məhdudiyyətlər:</p>
        <ul>
          <li>Müştəridən yalnız ona son 90 gündə satılmış mal qaytarıla bilər.</li>
          <li>Təchizatçıya yalnız ondan alınıb hələ satılmamış mal qaytarılır. Başqa təchizatçının malı qarışmır.</li>
          <li>Qaytarma Hesabatda satışdan və qazancdan çıxılır.</li>
        </ul>
      </section>

      <section>
        <h2>13. Ödənişlər</h2>
        <p>
          <b>Müştəridən:</b> müştərinin səhifəsi → Ödəniş al. Məbləği yaz, üsulu seç (nağd, kart, köçürmə). “Bütün borcu yaz” düyməsi məbləği özü doldurur.
        </p>
        <p>
          <b>Təchizatçıya:</b> təchizatçının səhifəsi → Ödəniş et. Qaydası eynidir. Hər ödəniş borcu azaldır.
        </p>
      </section>

      <section>
        <h2>14. Hesabatlar</h2>
        <p>Əsas səhifənin aşağısında Bu gün və Bu ay üzrə qısa rəqəmlər var. Ətraflısı Hesabat bölməsindədir.</p>
        <Table
          head={['Bölmə', 'Nəyi göstərir']}
          rows={[
            ['Satışlar', 'Seçdiyin dövrdə satış, yığılan pul, yeni borc, qazanc və ən çox satılan mallar'],
            ['Borclar', 'Hansı müştərinin nə qədər borcu var'],
            ['Qalıq', 'Anbarda və müştərilərdə olan mal'],
          ]}
        />
        <p>Bu rəqəmlərin mənası:</p>
        <ul>
          <li>Satış: satılan mallardan qaytarılanlar çıxılandan sonra qalan məbləğ.</li>
          <li>Yığılan pul: satış anında alınan pul və sonradan alınan ödənişlər.</li>
          <li>Qazanc: satış qiyməti ilə o maldan əvvəl ödədiyin alış qiymətinin fərqi.</li>
          <li>Müştərilərdə mal: hələ satılmamış verilən mal. Onun qiyməti artıq borca daxildir.</li>
        </ul>
        <p>Satışlar siyahısını Excel-də açmaq üçün “CSV yüklə” düyməsi var.</p>
      </section>

      <section>
        <h2>15. Səhv yazıbsansa</h2>
        <p>
          Müştərinin və ya təchizatçının səhifəsində Tarixçədə hər əməliyyatın yanında “Ləğv et” düyməsi var. Ləğv edəndə mal, borc və qalıq əvvəlki
          vəziyyətə qayıdır, əməliyyat isə solğun görünüb “Ləğv edilib” yazılır. Silinmir.
        </p>
        <p>
          Bəzən ləğv etmək mümkün olmur. Məsələn, qaytarılan mal artıq başqasına satılıbsa, proqram bunu yazıb icazə vermir. Bu halda əks əməliyyatı özün yaz.
        </p>
      </section>

      <section>
        <h2>16. İnternet olmayanda</h2>
        <ul>
          <li>Yuxarıda “Sinxron” yazılıbsa, hər şey serverə göndərilib. “Oflayn” yazılıbsa, internet yoxdur.</li>
          <li>Oflayn halda satış, ödəniş və alış yaza bilərsən. Yazılanlar telefonda qalır.</li>
          <li>Hesab səhifəsində göndərilməmiş yazı olub-olmadığı görünür. Varsa, internet olan yerdə proqramı açıq saxla.</li>
          <li>İnternet gələndə yazılar özü göndərilir. Eyni hesabla başqa telefondan da girə bilərsən.</li>
          <li>Telefondan proqramı silsən və göndərilməmiş yazı varsa, o yazılar itir. Silməzdən əvvəl Sinxron yazısını gözlə.</li>
        </ul>
      </section>

      <section>
        <h2>17. Qısa xatırlatma</h2>
        <ul>
          <li>Hər satışda müştərini düzgün seç, borc ona yazılır.</li>
          <li>Malı anbara yalnız “Mal alışı” ilə daxil et. Yoxsa təchizatçıya borc və alış qiyməti düzgün çıxmaz.</li>
          <li>Anbarın real sayı fərqlənirsə, malın səhifəsində “Sayı düzəlt” istifadə et.</li>
          <li>Satış və ödəniş siyahıları son 90 günü göstərir. Borclar isə bütün tarixi əhatə edir.</li>
        </ul>
        <p className="muted center small">
          <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer">
            By securtiy_group
          </a>
        </p>
        <Link className="btn block" to="/">
          Əsas səhifəyə qayıt
        </Link>
      </section>
    </div>
  )
}
