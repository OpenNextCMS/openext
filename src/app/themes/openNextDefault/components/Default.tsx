import { useEffect, useState, JSX } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const typeToTag: Record<string, keyof JSX.IntrinsicElements> = {
    column: 'div',
    text: 'div',
};

type JsonElement = {
    type: string;
    style?: React.CSSProperties;
    content?: string;
    children?: JsonElement[][];
};

const renderFromJson = (element: JsonElement, key?: number | string): JSX.Element | null => {
    const tag = typeToTag[element.type] || 'div';
    const Tag = tag as keyof JSX.IntrinsicElements;

    const style = element.style || {};
    const content = element.content || '';
    const children = element.children || [];

    return (
        <Tag key={key} style={style}>
            {content}
            {Array.isArray(children) &&
                children.map((row: JsonElement[], rowIndex: number) =>
                    row.map((child, colIndex) =>
                        renderFromJson(child, `${rowIndex}-${colIndex}`)
                    )
                )}
        </Tag>
    );
};

const Default = () => {
    const [pageData, setPageData] = useState<JsonElement | null>(null);

    useEffect(() => {
        let url = `${backendUrl}/api/pages/get-pages`;
        const checkTokenAndSetUrl = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/check-token`);
                if (!res.ok) {
                    url = `${backendUrl}/api/pages/get-page?name=default_home`;
                }
            } catch (err) {
                console.error('Token check failed:', err);
            }

            try {
                const res = await fetch(url);
                const data = await res.json();

                const container = data.page || data.pages?.[0];
                if (!container?.isHome) {
                    console.error('This is not a home page');
                    return;
                }

                const defaultComponent = container.component?.find(
                    (comp: { name: string }) => comp.name === 'defaultData'
                )?.data?.[0];

                setPageData(defaultComponent);
            } catch (err) {
                console.error('Failed to fetch page data:', err);
            }
        };

        checkTokenAndSetUrl();
    }, []);

    if (!pageData) return <div>Loading...</div>;

    return renderFromJson(pageData);
};

export default Default;
